import React from 'react';
import { Collection } from '../models/collection';
import { CollectionCard } from './CollectionCard';
import './CollectionList.css';
import '../styles/scrollbar.css';

type CollectionListProps = {
  collections: Collection[];
  onCollectionClick?: (collection: Collection) => void;
  onCreateClick?: () => void;
  showCreateButton?: boolean;
};

/**
 * CollectionList 组件
 * 展示作品集列表，固定高度可滚动
 */
export const CollectionList: React.FC<CollectionListProps> = ({ 
  collections,
  onCollectionClick = () => {},
  onCreateClick,
  showCreateButton = true
}) => {
  return (
    <div className="collection-list">
      <header className="collection-list__header">
        <h1 className="collection-list__title">Collections</h1>
      </header>

      <div className="collection-list__scroll-container app-scrollbar">
        {collections.map(collection => (
          <CollectionCard 
            key={collection.id} 
            collection={collection}
            onClick={() => onCollectionClick(collection)}
          />
        ))}
      </div>

      {showCreateButton && (
        <button 
          className="collection-list__create-button"
          onClick={onCreateClick}
        >
          <span>+</span>
          <span>New Collection</span>
        </button>
      )}
    </div>
  );
};
