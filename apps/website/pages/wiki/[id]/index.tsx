import axios from 'axios';
import { useCallback, useContext, useEffect, useState } from 'react';
import groupBy from 'lodash.groupby';
import { useRouter } from 'next/router';
import { DateTime } from 'luxon';
import { Fade } from '@treelof/animations';
import WikiPageMdx from '../../../mdx/wiki/page.mdx';
import WikiEditPageMdx from '../../../mdx/wiki/edit-page.mdx';
import WikiRevisionsMdx from '../../../mdx/wiki/revisions.mdx';
import WikiContainer from '../../../components/wiki/container';
import { CharacteristicContext } from '../../../context/characteristic';
import {
  HiOutlineBookOpen,
  HiOutlineCollection,
  HiOutlinePencil
} from 'react-icons/hi';
import { FormProvider, useForm } from 'react-hook-form';
import { Plant, Revision } from '@treelof/models';
import { createRevision, getRevisions } from '@treelof/services';
import { Loader, Tabs } from '@treelof/components';
import { copyObject } from '@treelof/utils';

const WikiPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { loading } = useContext(CharacteristicContext);
  const methods = useForm<Plant>();
  const {
    handleSubmit,
    formState: { errors },
    setValue
  } = methods;

  const [plant, setPlant] = useState<Plant>();
  // revisions grouped by date
  const [revisions, setRevisions] = useState<Record<string, Array<Revision>>>();
  const [showLoader, setShowLoader] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // the form is saving

  useEffect(() => {
    // only show the loader after timeout
    setTimeout(() => setShowLoader(true), 1000);
  }, []);

  // get the plant from the database with the necessary metadata
  const getPlant = useCallback(async () => {
    if (id)
      await axios.get<Plant>(`/plants/${id}`).then(({ data }) => {
        setPlant(data);
        for (const key of Object.keys(data)) {
          // @ts-ignore
          setValue(key, data[key]);
        }
      });
  }, [id, setValue]);

  // make initial call
  useEffect(() => {
    getPlant();
    // get the revision history for this plant
    getRevisions('plants', `${id}`).then(({ data }) => {
      const newRevisions = groupBy(data, (item: Revision) => {
        // the date format to group these items by
        const format = 'yyyy-MM-dd';
        // approved on date
        if (item.approved_on)
          return DateTime.fromISO(item.approved_on).toFormat(format);
        // rejected date
        else if (item.rejected_on)
          return DateTime.fromISO(item.rejected_on).toFormat(format);
        // created date
        else return DateTime.fromISO(item.created_at).toFormat(format);
      });
      console.log('newRevisions', newRevisions);
      setRevisions(copyObject(newRevisions));
    });
  }, [id]);

  const selectedTab = () => {
    const hashes = router.asPath.match(/#([a-z0-9]+)/gi) ?? [];
    if (hashes?.length > 0) {
      // selected tab based on the hash
      switch (hashes[0]) {
        case '#edit':
          return 1;
        case '#revisions':
          return 2;
        case '#read':
        default:
          return 0;
      }
    }
    return 0;
  };

  /**
   * Change a tab
   * @param value
   */
  const onChangeTab = (value: number) => {
    let hash = '';
    // selected tab based on the hash
    switch (value) {
      case 0:
      default:
        hash = '#read';
        break;
      case 1:
        hash = '#edit';
        break;
      case 2:
        hash = '#revisions';
        break;
    }
    return hash;
  };

  /* When the edit form is submitted */
  const onEditSubmit = async () => {
    setIsSaving(true);
    await createRevision({
      owner_id: '23504e74-b9e7-4a69-8003-843bad54a207',
      reference: 'plants',
      reference_id: `${id}`,
      changes: {
        edibilities: ['roots', 'leaves'],
        sun_preferences: ['full_shade']
      }
    });
    setIsSaving(false);
    onChangeTab(0);
  };

  const _renderTab = () => {
    switch (selectedTab()) {
      // read
      case 0:
        return <WikiPageMdx plant={plant} />;
      // edit
      case 1:
        return (
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onEditSubmit)}>
              <WikiEditPageMdx plant={plant} methods={methods} />
            </form>
          </FormProvider>
        );
      // revision history
      case 2:
        return <WikiRevisionsMdx revisions={revisions} />;
    }
  };

  return (
    <WikiContainer>
      {/* loader indicator */}
      {loading && showLoader && (
        <div className="flex w-full h-full items-center justify-center">
          <Loader color="indigo" size={10} />
        </div>
      )}
      {/* page */}
      <Fade show={!loading}>
        <div className="flex flex-col">
          {/* read page */}
          {plant && (
            <div className="space-y-6 -mt-5">
              <Tabs
                selectedTab={selectedTab()}
                tabs={[
                  {
                    label: 'Read',
                    icon: (className) => (
                      <HiOutlineBookOpen className={className} />
                    ),
                    hash: '#read'
                  },
                  {
                    label: 'Edit',
                    icon: (className) => (
                      <HiOutlinePencil className={className} />
                    ),
                    hash: '#edit'
                  },
                  {
                    label: 'Revisions',
                    icon: (className) => (
                      <HiOutlineCollection className={className} />
                    ),
                    hash: '#revisions'
                  }
                ]}
                onChange={(value) => onChangeTab(value)}
              />
              <div className="px-6">{_renderTab()}</div>
            </div>
          )}
        </div>
      </Fade>
    </WikiContainer>
  );
};

export default WikiPage;
